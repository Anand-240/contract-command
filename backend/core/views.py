from datetime import date
from decimal import Decimal, InvalidOperation
from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, connection, transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema
from .models import Amendment, Approval, AuditEntry, Contract, Delivery, Invoice, NotificationRead, Payment, ProcurementPlan, PurchaseOrder, Vendor, VendorEvaluation
from .serializers import EmptySerializer, LoginRequestSerializer, LoginResponseSerializer, UserSerializer, ApprovalEventSerializer, AmendmentSerializer, AuditEntrySerializer, ContractSerializer, DeliverySerializer, InvoiceSerializer, PaymentSerializer, ProcurementPlanSerializer, PurchaseOrderSerializer, VendorEvaluationSerializer, VendorSerializer
from .services import approve_invoice, audit, calculate_invoice, calculate_order, code, create_payment, decide_plan, match_invoice, money, positive, record_delivery, require, role, submit_plan, transition_contract, transition_payment

class SchemaAPIView(generics.GenericAPIView):
    serializer_class = EmptySerializer

class HealthView(SchemaAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return Response({'status': 'ok'})

class LoginView(SchemaAPIView):
    permission_classes = [AllowAny]
    @extend_schema(request=LoginRequestSerializer, responses={200: LoginResponseSerializer}, description='Authenticate with an assigned role. Returns a token for the Authorization header.')
    def post(self, request):
        email = request.data.get('email', '')
        user = get_user_model().objects.filter(email__iexact=email).first()
        authenticated = authenticate(request, username=user.username, password=request.data.get('password', '')) if user else None
        if not authenticated or not authenticated.is_active or role(authenticated) == 'unassigned':
            AuditEntry.objects.create(user=user, role=role(user) if user else 'anonymous', action='auth.login_failed', entityType='user', entityId=str(user.pk) if user else '', entityCode=user.username if user else '', detail='Failed sign in attempt.', ipAddress=request.META.get('REMOTE_ADDR'))
            return Response({'success': False, 'message': 'Invalid email or password.'}, status=401)
        Token.objects.filter(user=authenticated).delete()
        token = Token.objects.create(user=authenticated)
        audit(request_with_user(request, authenticated), 'auth.login', type('Login', (), {'_meta': type('Meta', (), {'model_name': 'user'}), 'pk': authenticated.pk, 'code': authenticated.username, 'status': 'authenticated'})())
        return Response({'token': token.key, 'user': user_data(authenticated)})

def request_with_user(request, user):
    request.user = user
    return request

def user_data(user):
    name = user.get_full_name() or user.username
    return {'id': str(user.pk), 'name': name, 'initials': ''.join(part[0] for part in name.split()[:2]).upper(), 'role': role(user), 'designation': role(user).replace('_', ' ').title(), 'department': 'Procurement', 'email': user.email}

class MeView(SchemaAPIView):
    serializer_class = UserSerializer
    def get(self, request): return Response(user_data(request.user))

class LogoutView(SchemaAPIView):
    def post(self, request):
        request.auth.delete()
        return Response(status=204)

class BaseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        filters = {field: self.request.query_params[field] for field in self.filter_fields if self.request.query_params.get(field)}
        if filters: qs = qs.filter(**filters)
        search = self.request.query_params.get('search')
        if search and self.search_fields:
            from django.db.models import Q
            query = Q()
            for field in self.search_fields: query |= Q(**{f'{field}__icontains': search})
            qs = qs.filter(query)
        return qs.order_by('-createdAt')
    filter_fields = ()
    search_fields = ()
    def destroy(self, request, *args, **kwargs):
        raise ValidationError({'record': 'Historical records cannot be deleted.'})
    def require_write(self, action): require(self.request.user, action)

class VendorViewSet(BaseViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    filter_fields = ('complianceStatus', 'active')
    search_fields = ('code', 'name', 'registrationNumber')
    def perform_create(self, serializer):
        self.require_write('vendor.manage')
        c = code('VEN'); obj = serializer.save(id=c, code=c)
        audit(self.request, 'vendor.created', obj)
    def perform_update(self, serializer):
        self.require_write('vendor.manage')
        old = {'name': serializer.instance.name, 'complianceStatus': serializer.instance.complianceStatus}
        obj = serializer.save(); audit(self.request, 'vendor.updated', obj, old)
    def destroy(self, request, *args, **kwargs):
        raise ValidationError({'vendor': 'Deactivate the vendor instead of deleting its history.'})
    @action(detail=True, methods=['get', 'post'])
    @transaction.atomic
    def evaluations(self, request, pk=None):
        vendor = self.get_object()
        if request.method == 'GET': return Response(VendorEvaluationSerializer(vendor.evaluations.all().order_by('-evaluatedOn'), many=True).data)
        require(request.user, 'vendor.evaluate')
        weights = request.data.get('weights') or {'delivery': 30, 'compliance': 30, 'quality': 25, 'cost': 15}
        scores = request.data.get('scores') or {}
        keys = {'delivery', 'compliance', 'quality', 'cost'}
        if not isinstance(weights, dict) or set(weights) != keys or not isinstance(scores, dict) or set(scores) != keys:
            raise ValidationError({'scores': 'Provide four scores and four scoring weights.'})
        try:
            numeric_weights = {key: Decimal(str(value)) for key, value in weights.items()}
            numeric_scores = {key: Decimal(str(value)) for key, value in scores.items()}
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({'scores': 'Scores and weights must be numbers.'})
        if any(not value.is_finite() or value < 0 or value > 100 for value in numeric_weights.values()) or sum(numeric_weights.values()) != 100:
            raise ValidationError({'weights': 'Four scoring weights must total 100.'})
        if any(not value.is_finite() or value < 0 or value > 100 for value in numeric_scores.values()):
            raise ValidationError({'scores': 'Provide four scores between 0 and 100.'})
        overall = sum(numeric_scores[k] * numeric_weights[k] / 100 for k in weights)
        c = code('EVL')
        evaluation = VendorEvaluation.objects.create(id=c, code=c, vendorId=vendor, period=request.data.get('period', timezone.now().strftime('%Y-Q1')), evaluatedOn=timezone.localdate(), evaluator=request.user.get_full_name() or request.user.username, scores=scores, weights=weights, overall=overall, notes=request.data.get('notes', ''))
        vendor.rating = overall; vendor.lastEvaluated = evaluation.evaluatedOn; vendor.save(update_fields=['rating', 'lastEvaluated'])
        audit(request, 'vendor.evaluated', evaluation)
        return Response(VendorEvaluationSerializer(evaluation).data, status=201)

class VendorEvaluationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VendorEvaluation.objects.select_related('vendorId').order_by('-evaluatedOn')
    serializer_class = VendorEvaluationSerializer

class PlanViewSet(BaseViewSet):
    queryset = ProcurementPlan.objects.all()
    serializer_class = ProcurementPlanSerializer
    filter_fields = ('status', 'department', 'priority')
    search_fields = ('code', 'title', 'department')
    def get_queryset(self):
        if role(self.request.user) == 'vendor_manager': raise PermissionDenied('This role cannot access procurement plans.')
        return super().get_queryset()
    def perform_create(self, serializer):
        self.require_write('plan.create')
        c = code('PROC'); obj = serializer.save(id=c, code=c, owner=self.request.user.get_full_name() or self.request.user.username)
        audit(self.request, 'procurement.created', obj)
    def perform_update(self, serializer):
        self.require_write('plan.create')
        if serializer.instance.status != 'draft': raise ValidationError({'status': 'Only draft plans can be edited.'})
        if role(self.request.user) != 'admin' and serializer.instance.owner != (self.request.user.get_full_name() or self.request.user.username):
            raise PermissionDenied('Only the owner can edit this draft plan.')
        obj = serializer.save(); audit(self.request, 'procurement.updated', obj)
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        plan = self.get_object()
        if role(request.user) != 'admin' and plan.owner != (request.user.get_full_name() or request.user.username):
            raise PermissionDenied('Only the owner can submit this plan.')
        return Response(self.get_serializer(submit_plan(request, plan)).data)
    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        return Response(self.get_serializer(decide_plan(request, self.get_object(), request.data.get('decision'), request.data.get('comments', ''))).data)

class ContractViewSet(BaseViewSet):
    queryset = Contract.objects.select_related('vendorId', 'planId').prefetch_related('amendments')
    serializer_class = ContractSerializer
    filter_fields = ('status', 'vendorId')
    search_fields = ('code', 'title', 'department')
    @transaction.atomic
    def perform_create(self, serializer):
        self.require_write('contract.create')
        plan = serializer.validated_data.get('planId')
        if not plan: raise ValidationError({'planId': 'An approved procurement plan is required.'})
        vendor = serializer.validated_data['vendorId']
        if not vendor.active or vendor.complianceStatus != 'compliant': raise ValidationError({'vendorId': 'Vendor must be active and compliant.'})
        c = code('CT'); obj = serializer.save(id=c, code=c, owner=self.request.user.get_full_name() or self.request.user.username)
        plan.status = 'converted'; plan.linkedContractId = c; plan.save(update_fields=['status', 'linkedContractId', 'updatedAt'])
        audit(self.request, 'contract.created', obj)
    def perform_update(self, serializer):
        self.require_write('contract.create')
        if serializer.instance.status != 'draft': raise ValidationError({'status': 'Only draft contracts can be edited.'})
        for field in ('planId', 'vendorId'):
            if field in serializer.validated_data and serializer.validated_data[field].pk != getattr(serializer.instance, f'{field}_id'):
                raise ValidationError({field: 'The originating plan and awarded vendor cannot be changed.'})
        obj = serializer.save(); audit(self.request, 'contract.updated', obj)
    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        return Response(self.get_serializer(transition_contract(request, self.get_object(), request.data.get('status'))).data)
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def amendments(self, request, pk=None):
        require(request.user, 'contract.amend')
        contract = Contract.objects.select_for_update().get(pk=self.get_object().pk)
        if contract.status not in ('active', 'amended'): raise ValidationError({'status': 'Only an active contract can be amended.'})
        if contract.amendments.filter(status='pending_approval').exists():
            raise ValidationError({'amendment': 'Decide the pending amendment before raising another.'})
        amendment_type = request.data.get('type')
        type_fields = {'value_revision': {'value'}, 'timeline_extension': {'endDate'}, 'scope_change': {'scope'}, 'terms_revision': {'paymentTerms', 'deliveryTerms'}}
        if amendment_type not in type_fields:
            raise ValidationError({'type': 'Choose a valid amendment type.'})
        for field in ('summary', 'description', 'reason'):
            if not str(request.data.get(field, '')).strip():
                raise ValidationError({field: 'This field is required.'})
        try:
            effective_date = date.fromisoformat(request.data.get('effectiveDate', ''))
        except (TypeError, ValueError):
            raise ValidationError({'effectiveDate': 'Enter a valid date.'})
        changes = request.data.get('changes')
        if not isinstance(changes, list) or not changes:
            raise ValidationError({'changes': 'Record at least one field change.'})
        seen_fields = set()
        for change in changes:
            if not isinstance(change, dict) or change.get('field') not in type_fields[amendment_type]:
                raise ValidationError({'changes': 'This amendment type cannot change that field.'})
            field = change['field']
            if field in seen_fields:
                raise ValidationError({'changes': 'Each field may be changed only once.'})
            seen_fields.add(field)
            current = getattr(contract, field)
            if field == 'value':
                try:
                    previous_matches = Decimal(str(change.get('previous'))) == current
                except (InvalidOperation, TypeError, ValueError):
                    previous_matches = False
            else:
                previous_matches = str(change.get('previous', '')) == str(current)
            if not previous_matches:
                raise ValidationError({'changes': f'{field} no longer matches the current contract.'})
            updated = change.get('updated')
            if field == 'value':
                updated = str(positive(updated, 'value'))
            elif field == 'endDate':
                try:
                    updated = date.fromisoformat(updated).isoformat()
                except (TypeError, ValueError):
                    raise ValidationError({'endDate': 'Enter a valid revised end date.'})
                if updated < contract.startDate.isoformat():
                    raise ValidationError({'endDate': 'End date cannot precede contract start.'})
            elif not isinstance(updated, str) or not updated.strip():
                raise ValidationError({field: 'Enter revised wording.'})
            if str(updated) == str(current):
                raise ValidationError({'changes': f'{field} has not changed.'})
            change['updated'] = updated
        current = contract.version.split('.')
        version = f'{current[0]}.{int(current[-1]) + 1}'
        c = code('AMD')
        amendment = Amendment.objects.create(id=c, code=c, contract=contract, version=version, type=amendment_type, summary=request.data['summary'], description=request.data['description'], reason=request.data['reason'], effectiveDate=effective_date, requestedBy=request.user.get_full_name() or request.user.username, changes=changes)
        Approval.objects.create(entityType='amendment', entityId=amendment.pk, submittedBy=request.user)
        audit(request, 'contract.amendment_requested', amendment)
        return Response(self.get_serializer(self.get_object()).data, status=201)
    @extend_schema(parameters=[OpenApiParameter('amendment_id', str, OpenApiParameter.PATH)])
    @action(detail=True, methods=['post'], url_path='amendments/(?P<amendment_id>[^/.]+)/decide')
    @transaction.atomic
    def decide_amendment(self, request, pk=None, amendment_id=None):
        require(request.user, 'amendment.decide')
        contract = Contract.objects.select_for_update().get(pk=self.get_object().pk)
        amendment = get_object_or_404(contract.amendments, pk=amendment_id)
        if amendment.status != 'pending_approval': raise ValidationError({'status': 'Amendment already decided.'})
        decision = request.data.get('decision')
        if decision not in ('approve', 'reject'): raise ValidationError({'decision': 'Choose approve or reject.'})
        amendment.status = 'approved' if decision == 'approve' else 'rejected'
        amendment.approver = request.user.get_full_name() or request.user.username
        amendment.save(update_fields=['status', 'approver'])
        if decision == 'approve':
            for change in amendment.changes:
                field = change.get('field')
                if field in ('value', 'endDate', 'scope', 'paymentTerms', 'deliveryTerms'):
                    setattr(contract, field, change.get('updated'))
            contract.version = amendment.version; contract.status = 'amended'; contract.full_clean(exclude=['documents']); contract.save()
        approval = Approval.objects.filter(entityType='amendment', entityId=amendment.pk, status='pending').first()
        if approval:
            approval.status = amendment.status; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.save()
        audit(request, f'contract.amendment_{decision}', amendment)
        return Response(self.get_serializer(self.get_object()).data)

class POViewSet(BaseViewSet):
    def update(self, request, *args, **kwargs): raise ValidationError({'order': 'Purchase orders cannot be edited after issue.'})
    partial_update = update
    queryset = PurchaseOrder.objects.select_related('contractId', 'vendorId')
    serializer_class = PurchaseOrderSerializer
    filter_fields = ('vendorId', 'contractId', 'deliveryStatus', 'invoiceStatus')
    search_fields = ('code', 'deliveryLocation')
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        require(request.user, 'po.create')
        serializer = self.get_serializer(data=request.data); serializer.is_valid(raise_exception=True)
        contract = serializer.validated_data['contractId']
        if contract.status not in ('active', 'amended'): raise ValidationError({'contractId': 'Contract must be active.'})
        if serializer.validated_data['vendorId'].pk != contract.vendorId_id:
            raise ValidationError({'vendorId': 'Vendor must match contract.'})
        items, subtotal, tax = calculate_order(request.data.get('items'))
        c = code('PO')
        po = serializer.save(id=c, code=c, items=items, subtotal=subtotal, taxTotal=tax, total=subtotal + tax, currency=contract.currency)
        d = code('DEL')
        Delivery.objects.create(id=d, code=d, poId=po, vendorId=po.vendorId, lines=[{'itemId': item['id'], 'name': item['name'], 'unit': item['unit'], 'ordered': item['quantity'], 'delivered': 0, 'accepted': 0, 'rejected': 0, 'remarks': ''} for item in items])
        audit(request, 'purchase_order.created', po)
        return Response(self.get_serializer(po).data, status=201)
    @action(detail=True, methods=['get'])
    def delivery(self, request, pk=None):
        po = self.get_object()
        row = po.deliveries.order_by('-createdAt').first()
        return Response(DeliverySerializer(row).data if row else None)

class DeliveryViewSet(BaseViewSet):
    queryset = Delivery.objects.select_related('poId', 'vendorId')
    serializer_class = DeliverySerializer
    filter_fields = ('status', 'inspectionStatus', 'poId')
    search_fields = ('code', 'reference', 'receivedBy')
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        require(request.user, 'delivery.record')
        po = get_object_or_404(PurchaseOrder, pk=request.data.get('poId'))
        c = code('DEL'); row = Delivery.objects.create(id=c, code=c, poId=po, vendorId=po.vendorId)
        return Response(self.get_serializer(record_delivery(request, row, request.data)).data, status=201)
    def partial_update(self, request, *args, **kwargs):
        return Response(self.get_serializer(record_delivery(request, self.get_object(), request.data)).data)
    update = partial_update

class InvoiceViewSet(BaseViewSet):
    queryset = Invoice.objects.select_related('poId', 'vendorId', 'contractId')
    serializer_class = InvoiceSerializer
    filter_fields = ('matchStatus', 'approvalStatus', 'paymentStatus', 'vendorId', 'poId')
    search_fields = ('code', 'vendorInvoiceNumber')
    def get_queryset(self):
        if role(self.request.user) == 'vendor_manager': raise PermissionDenied('This role cannot access invoices.')
        return super().get_queryset()
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        require(request.user, 'invoice.create')
        serializer = self.get_serializer(data=request.data); serializer.is_valid(raise_exception=True)
        po = serializer.validated_data['poId']
        lines, amount = calculate_invoice(request.data.get('lines'), po)
        number = serializer.validated_data['vendorInvoiceNumber']
        if Invoice.objects.filter(vendorId=po.vendorId, vendorInvoiceNumber=number).exists():
            raise ValidationError({'vendorInvoiceNumber': 'This vendor invoice number is already recorded.'})
        c = code('INV')
        try:
            invoice = serializer.save(id=c, code=c, contractId=po.contractId, vendorId=po.vendorId, amount=amount, lines=lines, currency=po.currency)
        except IntegrityError:
            raise ValidationError({'vendorInvoiceNumber': 'This vendor invoice number is already recorded.'})
        po.invoiceStatus = 'invoiced'; po.save(update_fields=['invoiceStatus'])
        Approval.objects.create(entityType='invoice', entityId=invoice.pk, submittedBy=request.user)
        audit(request, 'invoice.submitted', invoice)
        return Response(self.get_serializer(invoice).data, status=201)
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        require(request.user, 'invoice.correct')
        invoice = self.get_object()
        if invoice.approvalStatus == 'approved' or invoice.paymentStatus == 'paid': raise ValidationError({'invoice': 'Approved or paid invoice cannot be edited.'})
        was_returned = invoice.approvalStatus in ('returned', 'rejected')
        lines, amount = calculate_invoice(request.data.get('lines', invoice.lines), invoice.poId)
        invoice.lines = lines; invoice.amount = amount; invoice.taxAmount = money(request.data.get('taxAmount', invoice.taxAmount)); invoice.matchStatus = 'awaiting_review'; invoice.match = {}; invoice.approvalStatus = 'pending'; invoice.save()
        if was_returned:
            Approval.objects.create(entityType='invoice', entityId=invoice.pk, submittedBy=request.user)
        audit(request, 'invoice.corrected', invoice)
        return Response(self.get_serializer(invoice).data)
    update = partial_update
    @action(detail=True, methods=['post'])
    def match(self, request, pk=None): return Response(self.get_serializer(match_invoice(request, self.get_object())).data)
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None): return Response(self.get_serializer(approve_invoice(request, self.get_object(), request.data.get('remarks', ''))).data)
    @action(detail=True, methods=['post'], url_path='return')
    @transaction.atomic
    def return_to_vendor(self, request, pk=None):
        require(request.user, 'invoice.decide')
        row = self.get_object()
        if row.approvalStatus != 'pending': raise ValidationError({'status': 'Invoice is not pending.'})
        row.approvalStatus = 'returned'; row.save(update_fields=['approvalStatus'])
        approval = Approval.objects.filter(entityType='invoice', entityId=row.pk, status='pending').order_by('-id').first()
        if approval:
            approval.status = 'returned'; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.comments = request.data.get('remarks', ''); approval.save()
        audit(request, 'invoice.returned', row, detail=request.data.get('remarks', ''))
        return Response(self.get_serializer(row).data)

class PaymentViewSet(BaseViewSet):
    def update(self, request, *args, **kwargs): raise ValidationError({'payment': 'Use payment transitions.'})
    partial_update = update
    queryset = Payment.objects.select_related('invoiceId', 'poId', 'contractId', 'vendorId')
    serializer_class = PaymentSerializer
    filter_fields = ('status', 'vendorId', 'invoiceId')
    search_fields = ('code', 'reference')
    def get_queryset(self):
        if role(self.request.user) not in ('admin', 'approver', 'auditor'): raise PermissionDenied('This role cannot access payments.')
        return super().get_queryset()
    def create(self, request, *args, **kwargs):
        require(request.user, 'payment.create')
        invoice = get_object_or_404(Invoice, pk=request.data.get('invoiceId'))
        payment = create_payment(request, invoice, request.data.get('amount'), request.data)
        return Response(self.get_serializer(payment).data, status=201)
    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        return Response(self.get_serializer(transition_payment(request, self.get_object(), request.data.get('status'), request.data.get('reference', ''))).data)
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return Response(self.get_serializer(transition_payment(request, self.get_object(), 'approved')).data)

class AuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditEntry.objects.select_related('user').order_by('-timestamp')
    serializer_class = AuditEntrySerializer
    def get_queryset(self):
        entity_id = self.request.query_params.get('entityId')
        if not entity_id:
            require(self.request.user, 'audit.read')
        qs = super().get_queryset()
        if entity_id and role(self.request.user) == 'vendor_manager':
            qs = qs.filter(entityType__in=('vendor', 'vendor_evaluation', 'contract', 'purchase_order', 'delivery'))
        if entity_id and role(self.request.user) == 'procurement_officer':
            qs = qs.exclude(entityType='payment')
        if self.request.query_params.get('user'): qs = qs.filter(user__username=self.request.query_params['user'])
        for field in ('entityId', 'role', 'entityType', 'action'):
            if self.request.query_params.get(field): qs = qs.filter(**{field: self.request.query_params[field]})
        if self.request.query_params.get('from'): qs = qs.filter(timestamp__date__gte=self.request.query_params['from'])
        if self.request.query_params.get('to'): qs = qs.filter(timestamp__date__lte=self.request.query_params['to'])
        if self.request.query_params.get('search'):
            from django.db.models import Q
            term = self.request.query_params['search']
            qs = qs.filter(Q(entityCode__icontains=term) | Q(action__icontains=term) | Q(detail__icontains=term) | Q(user__username__icontains=term))
        return qs

class ApprovalViewSet(viewsets.GenericViewSet):
    queryset = Approval.objects.all()
    serializer_class = ApprovalEventSerializer
    def list(self, request):
        require(request.user, 'approval.read')
        result = []
        for item in Approval.objects.filter(status='pending').select_related('submittedBy').order_by('submittedOn'):
            model = {'procurement_plan': ProcurementPlan, 'contract': Contract, 'invoice': Invoice, 'amendment': Amendment, 'payment': Payment}.get(item.entityType)
            entity = model.objects.filter(pk=item.entityId).first() if model else None
            if not entity: continue
            contract = entity.contract if item.entityType == 'amendment' else entity if item.entityType == 'contract' else None
            vendor = getattr(entity, 'vendorId', None) or (contract.vendorId if contract else None)
            amount = getattr(entity, 'value', getattr(entity, 'estimatedBudget', getattr(entity, 'amount', None)))
            if item.entityType == 'amendment': amount = contract.value
            previous = Approval.objects.filter(entityType=item.entityType, entityId=item.entityId).exclude(pk=item.pk).exclude(status='pending').select_related('approver').order_by('-decisionDate')[:5]
            result.append({
                'id': str(item.pk), 'entityType': item.entityType,
                'entityId': entity.contract_id if item.entityType == 'amendment' else item.entityId,
                'entityCode': entity.code,
                'title': getattr(entity, 'title', getattr(entity, 'vendorInvoiceNumber', getattr(entity, 'summary', 'Approval'))),
                'submittedBy': item.submittedBy.get_full_name() or item.submittedBy.username,
                'submittedOn': item.submittedOn.date().isoformat(),
                'amount': float(amount) if amount is not None else None,
                'currency': getattr(entity, 'currency', contract.currency if contract else 'INR'),
                'stage': 'Decision required', 'stageIndex': 1, 'stageCount': 1,
                'priority': getattr(entity, 'priority', 'medium'), 'dueDate': None,
                'department': getattr(entity, 'department', contract.department if contract else ''),
                'vendor': vendor.name if vendor else '',
                'summary': getattr(entity, 'description', getattr(entity, 'scope', '')),
                'changes': entity.changes if item.entityType == 'amendment' else [],
                'supportingDocuments': len(getattr(entity, 'documents', [])),
                'matchStatus': entity.matchStatus if item.entityType == 'invoice' else None,
                'previousDecisions': [f'{row.status.replace("_", " ")} by {row.approver.get_full_name() or row.approver.username if row.approver else "Unknown"}' for row in previous],
                'flag': 'Three way match must pass before approval.' if item.entityType == 'invoice' and entity.matchStatus != 'matched' else None,
            })
        if request.query_params.get('entityType'):
            result = [row for row in result if row['entityType'] == request.query_params['entityType']]
        if request.query_params.get('priority'):
            result = [row for row in result if row['priority'] == request.query_params['priority']]
        if request.query_params.get('department'):
            result = [row for row in result if row['department'] == request.query_params['department']]
        if request.query_params.get('search'):
            term = request.query_params['search'].casefold()
            result = [row for row in result if term in row['entityCode'].casefold() or term in row['submittedBy'].casefold() or term in row['title'].casefold()]
        return Response(result)
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def decision(self, request, pk=None):
        require(request.user, 'approval.read')
        approval = get_object_or_404(Approval, pk=pk, status='pending')
        decision = request.data.get('decision')
        if decision not in ('approve', 'reject', 'request_changes'):
            raise ValidationError({'decision': 'Choose approve, reject or request changes.'})
        if approval.entityType == 'procurement_plan': decide_plan(request, ProcurementPlan.objects.get(pk=approval.entityId), decision, request.data.get('remarks', ''))
        elif approval.entityType == 'contract': transition_contract(request, Contract.objects.get(pk=approval.entityId), {'approve': 'approved', 'reject': 'rejected', 'request_changes': 'draft'}[decision])
        elif approval.entityType == 'invoice':
            if decision == 'approve': approve_invoice(request, Invoice.objects.get(pk=approval.entityId), request.data.get('remarks', ''))
            else:
                require(request.user, 'invoice.decide')
                invoice = Invoice.objects.get(pk=approval.entityId)
                invoice.approvalStatus = 'returned' if decision == 'request_changes' else 'rejected'; invoice.save(update_fields=['approvalStatus'])
                approval.status = invoice.approvalStatus; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.comments = request.data.get('remarks', ''); approval.save()
                audit(request, f'invoice.{invoice.approvalStatus}', invoice, detail=approval.comments)
        elif approval.entityType == 'payment':
            if decision != 'approve': raise ValidationError({'decision': 'Use payment detail to process exceptions.'})
            transition_payment(request, Payment.objects.get(pk=approval.entityId), 'approved')
        elif approval.entityType == 'amendment':
            require(request.user, 'amendment.decide')
            amendment = Amendment.objects.select_related('contract').get(pk=approval.entityId)
            if decision not in ('approve', 'reject'): raise ValidationError({'decision': 'Choose approve or reject.'})
            contract = Contract.objects.select_for_update().get(pk=amendment.contract_id)
            amendment.refresh_from_db()
            if amendment.status != 'pending_approval':
                raise ValidationError({'status': 'Amendment already decided.'})
            amendment.status = 'approved' if decision == 'approve' else 'rejected'; amendment.approver = request.user.get_full_name() or request.user.username; amendment.save(update_fields=['status', 'approver'])
            if decision == 'approve':
                for change in amendment.changes:
                    if change.get('field') in ('value', 'endDate', 'scope', 'paymentTerms', 'deliveryTerms'): setattr(contract, change['field'], change['updated'])
                contract.version = amendment.version; contract.status = 'amended'; contract.full_clean(exclude=['documents']); contract.save()
            approval.status = amendment.status; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.comments = request.data.get('remarks', ''); approval.save()
            audit(request, f'contract.amendment_{decision}', amendment, detail=approval.comments)
        else: raise ValidationError({'decision': 'Unsupported approval type.'})
        return Response({'id': pk})

class DashboardView(SchemaAPIView):
    def get(self, request):
        plans = ProcurementPlan.objects.exclude(status='rejected')
        contracts = Contract.objects.all()
        active = contracts.filter(status__in=['active', 'amended'])
        invoices = Invoice.objects.filter(approvalStatus='approved').exclude(paymentStatus='paid')
        paid = Payment.objects.filter(status='paid')
        planned = plans.aggregate(v=Sum('estimatedBudget'))['v'] or 0
        committed = contracts.exclude(status__in=['draft', 'rejected', 'terminated']).aggregate(v=Sum('value'))['v'] or 0
        actual = paid.aggregate(v=Sum('netAmount'))['v'] or 0
        user_role = role(request.user)
        may_decide = user_role in ('admin', 'approver')
        metrics = {'activeContracts': active.count(), 'activeContractsDelta': '', 'totalContractValue': float(active.aggregate(v=Sum('value'))['v'] or 0), 'procurementBudget': float(planned), 'committedAmount': float(committed), 'actualSpend': float(actual), 'pendingApprovals': Approval.objects.filter(status='pending').count() if may_decide else 0, 'pendingApprovalsOverdue': 0, 'outstandingInvoices': invoices.count(), 'outstandingInvoiceValue': float(sum(i.amount + i.taxAmount for i in invoices)), 'vendorsUnderReview': Vendor.objects.exclude(complianceStatus='compliant').count(), 'vendorCount': Vendor.objects.count(), 'evaluationsCount': VendorEvaluation.objects.count(), 'pendingDeliveries': Delivery.objects.exclude(status='delivered').count(), 'pendingPayments': Payment.objects.filter(status='awaiting_approval').count() if may_decide else 0}
        bands = []
        for department in plans.values_list('department', flat=True).distinct():
            bands.append({'label': department, 'planned': float(plans.filter(department=department).aggregate(v=Sum('estimatedBudget'))['v'] or 0), 'committed': float(contracts.filter(department=department).aggregate(v=Sum('value'))['v'] or 0), 'actual': float(paid.filter(contractId__department=department).aggregate(v=Sum('netAmount'))['v'] or 0)})
        expiring = []
        for contract in active.filter(endDate__gte=timezone.localdate()).order_by('endDate')[:5]:
            row = ContractSerializer(contract).data; row['daysRemaining'] = (contract.endDate - timezone.localdate()).days; expiring.append(row)
        if user_role == 'vendor_manager':
            for key in ('activeContracts', 'totalContractValue', 'procurementBudget', 'committedAmount', 'actualSpend', 'outstandingInvoices', 'outstandingInvoiceValue'):
                metrics[key] = 0
        activity = AuditEntry.objects.order_by('-timestamp')
        if user_role == 'vendor_manager':
            activity = activity.filter(entityType__in=['vendor', 'vendor_evaluation', 'delivery'])
        elif user_role not in ('admin', 'auditor'):
            activity = activity.none()
        return Response({'metrics': metrics, 'contractStatus': [] if user_role == 'vendor_manager' else [{'status': s, 'label': s.replace('_', ' ').title(), 'count': contracts.filter(status=s).count(), 'value': float(contracts.filter(status=s).aggregate(v=Sum('value'))['v'] or 0)} for s in ('draft', 'under_review', 'approved', 'rejected', 'active', 'amended', 'closed', 'terminated')], 'spend': [] if user_role == 'vendor_manager' else bands[:5], 'spendTotals': {'planned': float(planned), 'committed': float(committed), 'actual': float(actual), 'remaining': float(max(planned - committed, 0))} if user_role != 'vendor_manager' else {'planned': 0, 'committed': 0, 'actual': 0, 'remaining': 0}, 'pendingActions': ApprovalViewSet().list(request).data[:6] if may_decide else [], 'expiringContracts': expiring if user_role != 'vendor_manager' else [], 'activity': AuditEntrySerializer(activity[:8], many=True).data})

class ReportsView(SchemaAPIView):
    def get(self, request):
        require(request.user, 'reports.read')
        kind = request.query_params.get('report', 'contract-spend')
        kinds = {'contract-spend', 'budget-utilisation', 'vendor-performance', 'invoice-processing', 'payment-status', 'contract-expiry', 'pending-approvals'}
        if kind not in kinds:
            raise ValidationError({'report': 'Unknown report.'})
        department = request.query_params.get('department')
        vendor = request.query_params.get('vendorId')
        start = request.query_params.get('from')
        end = request.query_params.get('to')
        try:
            start_date = date.fromisoformat(start) if start else None
            end_date = date.fromisoformat(end) if end else None
        except ValueError:
            raise ValidationError({'date': 'Use dates in YYYY-MM-DD format.'})
        if start_date and end_date and end_date < start_date:
            raise ValidationError({'date': 'The end date cannot precede the start date.'})
        contracts = Contract.objects.select_related('vendorId').all()
        invoices = Invoice.objects.select_related('vendorId').all()
        payments = Payment.objects.select_related('vendorId').all()
        plans = ProcurementPlan.objects.exclude(status='rejected')
        if department:
            contracts = contracts.filter(department=department)
            invoices = invoices.filter(contractId__department=department)
            payments = payments.filter(contractId__department=department)
            plans = plans.filter(department=department)
        if vendor:
            contracts = contracts.filter(vendorId=vendor)
            invoices = invoices.filter(vendorId=vendor)
            payments = payments.filter(vendorId=vendor)
        if start:
            contracts = contracts.filter(startDate__gte=start)
            invoices = invoices.filter(submittedDate__gte=start)
            payments = payments.filter(paymentDate__gte=start)
        if end:
            contracts = contracts.filter(startDate__lte=end)
            invoices = invoices.filter(submittedDate__lte=end)
            payments = payments.filter(paymentDate__lte=end)
        rows = []
        if kind == 'contract-spend':
            rows = [{'reference': row.code, 'name': row.title, 'status': row.status, 'value': float(row.value), 'date': row.startDate.isoformat()} for row in contracts]
        elif kind == 'budget-utilisation':
            rows = [{'reference': row.code, 'name': row.title, 'status': row.status, 'value': float(row.estimatedBudget), 'date': row.requiredDate.isoformat() if row.requiredDate else ''} for row in plans]
        elif kind == 'vendor-performance':
            vendors = Vendor.objects.filter(pk=vendor) if vendor else Vendor.objects.all()
            if start_date: vendors = vendors.filter(lastEvaluated__gte=start_date)
            if end_date: vendors = vendors.filter(lastEvaluated__lte=end_date)
            rows = [{'reference': row.code, 'name': row.name, 'status': row.complianceStatus, 'value': float(row.rating), 'date': row.lastEvaluated.isoformat() if row.lastEvaluated else ''} for row in vendors]
        elif kind == 'invoice-processing':
            rows = [{'reference': row.code, 'name': row.vendorInvoiceNumber, 'status': f'{row.matchStatus} / {row.approvalStatus}', 'value': float(row.amount + row.taxAmount), 'date': row.submittedDate.isoformat()} for row in invoices]
        elif kind == 'payment-status':
            rows = [{'reference': row.code, 'name': row.reference or row.invoiceId_id, 'status': row.status, 'value': float(row.netAmount), 'date': row.paymentDate.isoformat() if row.paymentDate else ''} for row in payments]
        elif kind == 'contract-expiry':
            rows = [{'reference': row.code, 'name': row.title, 'status': row.status, 'value': float(row.value), 'date': row.endDate.isoformat()} for row in contracts.order_by('endDate')]
        elif kind == 'pending-approvals':
            approvals = Approval.objects.filter(status='pending')
            if start_date: approvals = approvals.filter(submittedOn__date__gte=start_date)
            if end_date: approvals = approvals.filter(submittedOn__date__lte=end_date)
            rows = [{'reference': str(row.pk), 'name': f'{row.entityType} {row.entityId}', 'status': row.status, 'value': 0, 'date': row.submittedOn.date().isoformat()} for row in approvals]
        return Response({'rows': rows, 'count': len(rows), 'total': sum(row['value'] for row in rows)})

class SearchView(SchemaAPIView):
    def get(self, request):
        term = request.query_params.get('q', '').strip()
        if len(term) < 2: return Response([])
        hits = []
        for model, group, field, route in ((Contract, 'Contracts', 'title', 'contracts'), (Vendor, 'Vendors', 'name', 'vendors'), (PurchaseOrder, 'Purchase orders', 'code', 'purchase-orders'), (Invoice, 'Invoices', 'vendorInvoiceNumber', 'invoices'), (ProcurementPlan, 'Procurement plans', 'title', 'procurement')):
            if role(request.user) == 'vendor_manager' and model in (Invoice, ProcurementPlan):
                continue
            from django.db.models import Q
            for obj in model.objects.filter(Q(code__icontains=term) | Q(**{f'{field}__icontains': term}))[:4]:
                hits.append({'group': group, 'code': obj.code, 'title': getattr(obj, field), 'to': f'/app/{route}/{obj.pk}'})
        return Response(hits[:12])

class NotificationView(SchemaAPIView):
    def get(self, request):
        return Response(notification_rows(request.user))

def notification_rows(user):
    if role(user) not in ('admin', 'approver'):
        return []
    approvals = list(Approval.objects.filter(status='pending').order_by('-submittedOn')[:5])
    read_ids = set(NotificationRead.objects.filter(user=user, approval__in=approvals).values_list('approval_id', flat=True))
    rows = []
    for approval in approvals:
        rows.append({'id': str(approval.pk), 'title': 'Approval required', 'description': f'{approval.entityType.replace("_", " ").title()} {approval.entityId} awaits review.', 'timestamp': approval.submittedOn.isoformat(), 'tone': 'caution', 'link': '/app/approvals', 'read': approval.pk in read_ids})
    return rows

class NotificationReadView(SchemaAPIView):
    def post(self, request, pk=None):
        if role(request.user) not in ('admin', 'approver'):
            return Response([])
        if pk is not None:
            approval = Approval.objects.filter(pk=pk, status='pending').first()
            if approval is None:
                from rest_framework.exceptions import NotFound
                raise NotFound('Notification not found.')
            NotificationRead.objects.get_or_create(user=request.user, approval=approval)
        else:
            NotificationRead.objects.bulk_create(
                [NotificationRead(user=request.user, approval=approval) for approval in Approval.objects.filter(status='pending')],
                ignore_conflicts=True,
            )
        return Response(notification_rows(request.user))

class AuditFacetsView(SchemaAPIView):
    def get(self, request):
        require(request.user, 'audit.read')
        return Response({'users': list(get_user_model().objects.filter(auditentry__isnull=False).distinct().values_list('username', flat=True)), 'roles': list(AuditEntry.objects.values_list('role', flat=True).distinct()), 'actions': list(AuditEntry.objects.values_list('action', flat=True).distinct())})

class DocumentUploadView(SchemaAPIView):
    def post(self, request, pk, entity_type):
        import hashlib
        from pathlib import Path
        from .models import Document
        config = {
            'contract': (Contract, 'contract.create'),
            'amendment': (Amendment, 'contract.amend'),
            'vendor': (Vendor, 'vendor.manage'),
            'procurement_plan': (ProcurementPlan, 'plan.create'),
        }
        model, permission = config[entity_type]
        require(request.user, permission)
        entity = get_object_or_404(model, pk=pk)
        if entity_type == 'amendment' and entity.status != 'pending_approval':
            raise ValidationError({'status': 'Supporting documents must be added before the amendment decision.'})
        if entity_type == 'procurement_plan':
            if entity.status != 'draft':
                raise ValidationError({'status': 'Documents can only be added to draft plans.'})
            if role(request.user) != 'admin' and entity.owner != (request.user.get_full_name() or request.user.username):
                raise PermissionDenied('Only the owner can add documents to this plan.')
        upload = request.FILES.get('file')
        if not upload: raise ValidationError({'file': 'Select a file.'})
        ext = Path(upload.name).suffix.lower()
        if ext not in ('.pdf', '.docx', '.xlsx') or upload.size > 25 * 1024 * 1024:
            raise ValidationError({'file': 'Upload a PDF, DOCX or XLSX up to 25 MB.'})
        header = upload.read(8)
        if (ext == '.pdf' and not header.startswith(b'%PDF-')) or (ext in ('.docx', '.xlsx') and not header.startswith(b'PK')):
            raise ValidationError({'file': 'File content does not match its type.'})
        upload.seek(0)
        digest = hashlib.sha256()
        for chunk in upload.chunks(): digest.update(chunk)
        upload.seek(0)
        document = Document.objects.create(id=code('DOC'), entityType=entity_type, entityId=entity.pk, name=Path(upload.name).name, type=ext[1:], file=upload, sizeKb=(upload.size + 1023) // 1024, uploadedBy=request.user, version=getattr(entity, 'version', '1.0'), checksum=digest.hexdigest())
        metadata = {'id': document.pk, 'name': document.name, 'type': document.type, 'sizeKb': document.sizeKb, 'uploadedBy': request.user.get_full_name() or request.user.username, 'uploadedOn': document.uploadedOn.date().isoformat(), 'version': document.version, 'checksum': document.checksum}
        if entity_type == 'vendor':
            entity.complianceDocuments = [*entity.complianceDocuments, {'id': document.pk, 'name': document.name, 'reference': document.checksum, 'submittedOn': document.uploadedOn.date().isoformat(), 'expiresOn': None, 'status': 'pending'}]
            entity.save(update_fields=['complianceDocuments'])
        else:
            entity.documents = [*entity.documents, metadata]
            entity.save(update_fields=['documents'])
        audit(request, f'{entity_type}.document_uploaded', entity, detail=document.name)
        return Response(metadata, status=201)

class DocumentDownloadView(SchemaAPIView):
    def get(self, request, pk):
        from django.http import FileResponse, Http404
        from .models import Document
        try: document = Document.objects.get(pk=pk)
        except Document.DoesNotExist: raise Http404
        if document.entityType == 'procurement_plan' and role(request.user) == 'vendor_manager':
            raise PermissionDenied('This role cannot access procurement plan documents.')
        response = FileResponse(document.file.open('rb'), as_attachment=True, filename=document.name)
        response['X-Content-Type-Options'] = 'nosniff'
        return response
