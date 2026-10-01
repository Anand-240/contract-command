from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import DocumentUploadView, DocumentDownloadView, SearchView, NotificationView, NotificationReadView, AuditFacetsView, ApprovalViewSet, AuditViewSet, ContractViewSet, DashboardView, ReportsView, DeliveryViewSet, HealthView, InvoiceViewSet, LoginView, LogoutView, MeView, PaymentViewSet, PlanViewSet, POViewSet, VendorEvaluationViewSet, VendorViewSet

router = DefaultRouter()
router.register('vendors', VendorViewSet)
router.register('vendor-evaluations', VendorEvaluationViewSet)
router.register('procurement-plans', PlanViewSet)
router.register('contracts', ContractViewSet)
router.register('purchase-orders', POViewSet)
router.register('deliveries', DeliveryViewSet)
router.register('invoices', InvoiceViewSet)
router.register('payments', PaymentViewSet)
router.register('audit-log', AuditViewSet)
router.register('approvals', ApprovalViewSet, basename='approval')
health_url = path('health/', HealthView.as_view())
urlpatterns = [path('contracts/<str:pk>/documents/', DocumentUploadView.as_view(), {'entity_type': 'contract'}), path('amendments/<str:pk>/documents/', DocumentUploadView.as_view(), {'entity_type': 'amendment'}), path('vendors/<str:pk>/documents/', DocumentUploadView.as_view(), {'entity_type': 'vendor'}), path('procurement-plans/<str:pk>/documents/', DocumentUploadView.as_view(), {'entity_type': 'procurement_plan'}), path('documents/<str:pk>/download/', DocumentDownloadView.as_view()), path('search/', SearchView.as_view()), path('notifications/', NotificationView.as_view()), path('notifications/read-all/', NotificationReadView.as_view()), path('notifications/<str:pk>/read/', NotificationReadView.as_view()), path('audit-log/facets/', AuditFacetsView.as_view()), path('auth/login/', LoginView.as_view()), path('auth/logout/', LogoutView.as_view()), path('auth/me/', MeView.as_view()), path('dashboard/', DashboardView.as_view()), path('reports/', ReportsView.as_view()), path('', include(router.urls))]
urlpatterns.insert(0, health_url)
