import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProcurementListPage } from '@/modules/procurement/ProcurementListPage';
import { ProcurementNewPage } from '@/modules/procurement/ProcurementNewPage';
import { ProcurementDetailPage } from '@/modules/procurement/ProcurementDetailPage';
import { ContractListPage } from '@/modules/contracts/ContractListPage';
import { ContractNewPage } from '@/modules/contracts/ContractNewPage';
import { ContractDetailPage } from '@/modules/contracts/ContractDetailPage';
import { ContractAmendPage } from '@/modules/contracts/ContractAmendPage';
import { VendorNewPage } from '@/modules/vendors/VendorNewPage';
import { VendorListPage } from '@/modules/vendors/VendorListPage';
import { VendorDetailPage } from '@/modules/vendors/VendorDetailPage';
import { VendorEvaluatePage } from '@/modules/vendors/VendorEvaluatePage';
import { EvaluationListPage } from '@/modules/vendors/EvaluationListPage';
import { PurchaseOrderListPage } from '@/modules/purchase-orders/PurchaseOrderListPage';
import { PurchaseOrderNewPage } from '@/modules/purchase-orders/PurchaseOrderNewPage';
import { PurchaseOrderDetailPage } from '@/modules/purchase-orders/PurchaseOrderDetailPage';
import { DeliveryListPage } from '@/modules/deliveries/DeliveryListPage';
import { DeliveryDetailPage } from '@/modules/deliveries/DeliveryDetailPage';
import { InvoiceFormPage } from '@/modules/invoices/InvoiceFormPage';
import { InvoiceListPage } from '@/modules/invoices/InvoiceListPage';
import { InvoiceDetailPage } from '@/modules/invoices/InvoiceDetailPage';
import { InvoiceMatchPage } from '@/modules/invoices/InvoiceMatchPage';
import { PaymentListPage } from '@/modules/payments/PaymentListPage';
import { PaymentDetailPage } from '@/modules/payments/PaymentDetailPage';
import { AuditLogPage } from '@/modules/audit/AuditLogPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      { path: 'procurement', element: <ProcurementListPage /> },
      { path: 'procurement/new', element: <ProcurementNewPage /> },
      { path: 'procurement/:id', element: <ProcurementDetailPage /> },

      { path: 'contracts', element: <ContractListPage /> },
      { path: 'contracts/new', element: <ContractNewPage /> },
      { path: 'contracts/:id', element: <ContractDetailPage /> },
      { path: 'contracts/:id/amend', element: <ContractAmendPage /> },

      { path: 'vendors', element: <VendorListPage /> },
      { path: 'vendors/new', element: <VendorNewPage /> },
      { path: 'vendors/:id', element: <VendorDetailPage /> },
      { path: 'vendors/:id/edit', element: <VendorNewPage /> },
      { path: 'vendors/:id/evaluate', element: <VendorEvaluatePage /> },
      { path: 'evaluations', element: <EvaluationListPage /> },

      { path: 'purchase-orders', element: <PurchaseOrderListPage /> },
      { path: 'purchase-orders/new', element: <PurchaseOrderNewPage /> },
      { path: 'purchase-orders/:id', element: <PurchaseOrderDetailPage /> },

      { path: 'deliveries', element: <DeliveryListPage /> },
      { path: 'deliveries/:id', element: <DeliveryDetailPage /> },

      { path: 'invoices', element: <InvoiceListPage /> },
      { path: 'invoices/new', element: <InvoiceFormPage /> },
      { path: 'invoices/:id/correct', element: <InvoiceFormPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'invoices/:id/match', element: <InvoiceMatchPage /> },

      { path: 'approvals', element: <ApprovalsPage /> },

      { path: 'payments', element: <PaymentListPage /> },
      { path: 'payments/:id', element: <PaymentDetailPage /> },

      { path: 'audit', element: <AuditLogPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
